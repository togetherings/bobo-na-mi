"""Plays Bobo na Mi in EduGame Kit's test page, in Chromium.

    python3 tests/browser_test.py [--kit path/to/edugame-kit] [--screenshots out/]

Needs EduGame Kit (installed, or a copy given with --kit) and Playwright for Python.
The test page pretends to be a learning system (SCORM 1.2, with Kolibri's rules), the way
Kolibri Learn runs the game. It checks that:

  * a learner can solve a level, and coming back shows the tick and the best number of moves;
  * the save stays small, and no score is sent;
  * a level made in the editor is saved, and its code imports again;
  * French works, and the on-screen buttons show on a phone;
  * the page shows no errors.
"""
import argparse
import os
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def start_preview(kit, port):
    env = dict(os.environ)
    if kit:
        env["PYTHONPATH"] = os.path.abspath(kit) + os.pathsep + env.get("PYTHONPATH", "")
    proc = subprocess.Popen([sys.executable, "-m", "edugame", "preview", ROOT, "--no-browser", "--port", str(port)],
                            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    for _ in range(50):
        try:
            urllib.request.urlopen("http://127.0.0.1:%d/" % port, timeout=1)
            return proc
        except Exception:
            time.sleep(0.2)
    proc.kill()
    sys.exit("The kit's preview didn't start")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kit", default=None, help="folder with the edugame-kit source")
    parser.add_argument("--port", type=int, default=8812)
    parser.add_argument("--screenshots", default=None)
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    shots = args.screenshots
    if shots:
        os.makedirs(shots, exist_ok=True)

    def shot(page, name):
        if shots:
            page.screenshot(path=os.path.join(shots, name))

    proc = start_preview(args.kit, args.port)
    base = "http://127.0.0.1:%d/" % args.port
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()

            def new_page(width=1100, height=820, **kw):
                page = browser.new_context(viewport={"width": width, "height": height}, **kw).new_page()
                page.on("pageerror", lambda e: errors.append("page: %s" % e))
                page.on("console", lambda m: m.type == "error" and errors.append("console: %s" % m.text))
                return page

            def open_game(page, lang=None):
                page.goto(base)
                page.locator("#game").wait_for()
                page.select_option("#mode", "scorm")
                if not page.is_checked("#as-kolibri"):
                    page.check("#as-kolibri")
                if lang:
                    page.select_option("#lang", lang)
                frame = page.frame_locator("#game")
                frame.locator("#btn-play:not([disabled])").wait_for()
                return frame

            def press(page, keys):
                names = {"r": "ArrowRight", "u": "ArrowUp", "l": "ArrowLeft", "d": "ArrowDown", "w": "Space"}
                for k in keys:
                    page.keyboard.press(names[k])

            # 1. Solve level 1 with the keyboard
            page = new_page()
            frame = open_game(page)
            page.wait_for_timeout(300)
            shot(page, "1-title.png")
            frame.locator("#btn-play").click()
            shot(page, "2-levels.png")
            frame.locator("#level-list button").first.click()
            frame.locator("#game-canvas").click()
            page.wait_for_timeout(200)
            shot(page, "3-level1.png")
            press(page, "rrrrrrr")
            frame.locator("#win-box:not(.hidden)").wait_for()
            sub = frame.locator("#win-sub").inner_text()
            assert "7 moves" in sub, sub
            shot(page, "4-won.png")

            # 2. What the learning system keeps: a small save, no score
            cmi = page.evaluate("() => JSON.parse(localStorage.getItem('edugame-test-scorm:org.togetherings.bobo-na-mi') || '{}')")
            data = cmi.get("cmi.suspend_data", "")
            assert '"fos-step":7' in data, data
            assert len(data) < 4096, len(data)
            assert not cmi.get("cmi.core.score.raw"), cmi

            # 3. Coming back: the tick and the best number of moves
            page.click("#reload")
            frame = page.frame_locator("#game")
            frame.locator("#btn-play:not([disabled])").wait_for()
            frame.locator("#btn-play").click()
            first = frame.locator("#level-list button").first.inner_text()
            assert "✓" in first and "best 7 moves" in first, first

            # 4. The editor: a new level, saved, exported and imported again
            frame.locator("#screen-levels [data-go=title]").click()
            frame.locator("#btn-editor").click()
            frame.locator("#ed-palette [data-tool='bobo']").click()
            box = frame.locator("#ed-canvas").bounding_box()
            cell = box["width"] / 12
            frame.locator("#ed-canvas").click(position={"x": cell * 2.5, "y": cell * 2.5})
            for i, tool in enumerate(["T:bobo", "T:na", "T:mi"]):
                frame.locator("#ed-palette [data-tool='%s']" % tool).click()
                frame.locator("#ed-canvas").click(position={"x": cell * (1.5 + i), "y": cell * 0.5})
            assert "BOBO NA MI" in frame.locator("#ed-rules").inner_text()
            frame.locator("#ed-name").fill("Mi level")
            frame.locator("#ed-save").click()
            shot(page, "5-editor.png")
            frame.locator("#ed-export").click()
            code = frame.locator("#ed-code").input_value()
            assert code.startswith("BNM1|12|10|Mi level|"), code
            frame.locator("#modal-buttons button.primary").click()
            frame.locator("#ed-new").click()
            frame.locator("#modal-buttons button.primary").click()
            frame.locator("#ed-import").click()
            frame.locator("#ed-paste").fill(code)
            frame.locator("#modal-buttons button.primary").click()
            assert frame.locator("#ed-name").input_value() == "Mi level"
            assert "BOBO NA MI" in frame.locator("#ed-rules").inner_text()
            cmi = page.evaluate("() => JSON.parse(localStorage.getItem('edugame-test-scorm:org.togetherings.bobo-na-mi') || '{}')")
            assert "BNM1|12|10|Mi level|" in cmi.get("cmi.suspend_data", ""), "the level is in the save"

            # 5. French, on a phone, with the on-screen buttons
            phone = new_page(390, 800, has_touch=True, is_mobile=True)
            frame = open_game(phone, "fr")
            assert frame.locator("#btn-play").inner_text() == "Jouer"
            shot(phone, "6-phone-title-fr.png")
            frame.locator("#btn-play").click()
            frame.locator("#level-list button").nth(6).click()
            frame.locator(".touch .pad.left").wait_for()
            assert frame.locator(".touch").is_visible(), "on-screen buttons on a phone"
            frame.locator(".pad.left").tap()
            phone.wait_for_timeout(200)
            shot(phone, "7-phone-titi.png")

            # 6. The words screen
            frame.locator("#screen-game [data-action=menu]").tap()
            frame.locator("#screen-levels [data-go=title]").tap()
            frame.locator("[data-go=words]").tap()
            assert frame.locator(".word-card").count() == 24
            shot(phone, "8-words.png")
            browser.close()
    finally:
        proc.kill()

    if errors:
        print("Errors:\n  " + "\n  ".join(errors))
        sys.exit(1)
    print("All passed")


if __name__ == "__main__":
    main()
