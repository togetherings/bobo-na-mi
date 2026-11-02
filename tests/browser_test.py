"""Plays Bobo na Mi in the Kolibri Games preview server, in Chromium.

    python3 tests/browser_test.py path/to/kolibri-games [--screenshots out/]

Needs a copy of https://github.com/togetherings/kolibri-games (no install
needed) and Playwright for Python. It checks that:

  * a learner can solve a level, and the save (ticks, best moves) is on the
    server: a second browser, like a second device, sees it;
  * the editor doesn't offer Download (the sandbox blocks downloads);
  * a coach's challenge fixes the level, and the solve is scored and ranked;
  * the game shows no errors.
"""
import argparse
import os
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, "..", "game")
KEY = "f-org.togetherings.bobo-na-mi"


def serve(platform_src, port):
    """Start the preview server with only this game in it."""
    games = tempfile.mkdtemp(prefix="bnm-games-")
    os.symlink(os.path.abspath(GAME), os.path.join(games, "bobo-na-mi"))
    os.environ["KOLIBRI_GAMES_PATH"] = games
    os.environ["KOLIBRI_HOME"] = tempfile.mkdtemp(prefix="bnm-home-")
    os.environ["KOLIBRI_GAMES_DEV_QUIET"] = "1"
    sys.path.insert(0, os.path.abspath(platform_src))
    from kolibri_games import devserver, registry
    registry.discover(refresh=True)
    server = ThreadingHTTPServer(("127.0.0.1", port), devserver.Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def press(page, keys):
    names = {"r": "ArrowRight", "u": "ArrowUp", "l": "ArrowLeft", "d": "ArrowDown", "w": "Space"}
    for k in keys:
        page.keyboard.press(names[k])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("platform", help="folder with the kolibri-games source")
    parser.add_argument("--port", type=int, default=8798)
    parser.add_argument("--screenshots", default=None)
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    shots = args.screenshots
    if shots:
        os.makedirs(shots, exist_ok=True)

    def shot(page, name):
        if shots:
            page.screenshot(path=os.path.join(shots, name))

    serve(args.platform, args.port)
    base = "http://127.0.0.1:%d/" % args.port
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()

        def new_page(width=1200, height=860, **kw):
            ctx = browser.new_context(viewport={"width": width, "height": height}, **kw)
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append("page: %s" % e))
            page.on("console", lambda m: m.type == "error" and errors.append("console: %s" % m.text))
            return page

        def open_game(page, who, hash_="#/play/" + KEY):
            page.goto(base + "?as=" + who + hash_)
            frame = page.frame_locator("iframe.game-frame")
            frame.locator("#btn-play:not([disabled])").wait_for()
            return frame

        # 1. Amina solves level 1 in free play
        page = new_page()
        frame = open_game(page, "amina")
        shot(page, "1-title.png")
        assert frame.locator("#btn-editor").is_visible(), "the editor is on by default"
        frame.locator("#btn-play").click()
        frame.locator("#level-list button").first.click()
        frame.locator("#game-canvas").click()
        press(page, "rrrrrrr")
        frame.locator("#win-box:not(.hidden)").wait_for()
        sub = frame.locator("#win-sub").inner_text()
        assert "7 moves" in sub, sub
        shot(page, "2-won.png")
        frame.locator("#win-back").click()
        page.wait_for_timeout(1500)                     # the save is sent after a short pause

        # Export offers Copy but not Download inside Kolibri Games
        frame.locator("[data-go=title]").first.click()
        frame.locator("#btn-editor").click()
        frame.locator("#ed-export").click()
        buttons = frame.locator("#modal-buttons button").all_inner_texts()
        assert "Download" not in buttons and "Copy" in buttons, buttons

        # 2. Another device: a new browser, same learner, sees the save from the server
        other = new_page(390, 800, has_touch=True, is_mobile=True)
        frame2 = open_game(other, "amina")
        frame2.locator("#btn-play").click()
        first = frame2.locator("#level-list button").first.inner_text()
        assert "✓" in first and "best 7 moves" in first, first
        shot(other, "3-other-device.png")

        # 3. The coach makes a challenge on level 5, Ki en Dor
        page.goto(base + "?as=coach#/challenges/" + KEY + "/new")
        page.locator("#c-title").fill("Key race")
        page.select_option("#f-g-level", label="5. Ki en Dor (Key and door)")
        page.locator("button:has-text('Make challenge')").click()
        page.locator(".challenge-panel").first.wait_for()

        # 4. Ben plays the challenge: the level is fixed, and the solve is ranked
        page.goto(base + "?as=ben#/")
        page.locator(".game", has_text="Bobo na Mi").locator(".challenge a:has-text('Play')").click()
        frame = page.frame_locator("iframe.game-frame")
        frame.locator("#btn-play:not([disabled])").wait_for()
        assert "Ki en Dor" in frame.locator("#btn-play").inner_text()
        assert "Key race" in frame.locator("#challenge-note").inner_text()
        assert not frame.locator("#btn-editor").is_visible(), "no editor in challenges"
        frame.locator("#btn-play").click()
        frame.locator("#game-canvas").click()
        press(page, "rrrrrrrrrr")
        frame.locator("#win-info:has-text('1st of 1')").wait_for()
        assert frame.locator("#win-next").is_hidden(), "no next level in a challenge"
        shot(page, "4-challenge-won.png")

        browser.close()

    if errors:
        print("Errors:\n  " + "\n  ".join(errors))
        sys.exit(1)
    print("All passed")


if __name__ == "__main__":
    main()
