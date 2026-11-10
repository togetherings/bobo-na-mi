"""
Play steps for `edugame kolibri-test`: how a learner plays Bobo na Mi, so the test can check
that Kolibri keeps their progress. (This file is never put in the game's zip.)

`game` can: click(selector), fill(selector, text), text(selector), press(*keys),
hold(key, ms), js(expression), wait_for(expression), check(condition, what), shot(name).
game.data is kept from the first visit to the second.
"""


def first_visit(game):
    # Solve the first level: seven steps right push the rock and reach the flag.
    game.check(game.wait_for("!document.getElementById('btn-play').disabled"), "the game is ready")
    game.click("#btn-play")
    game.click("#level-list button")
    game.click("#game-canvas")                      # so the canvas gets the keys
    game.press(*["ArrowRight"] * 7)
    game.check(game.wait_for("!document.getElementById('win-box').classList.contains('hidden')"), "the level is solved")
    game.data["moves"] = game.text("#win-sub")
    game.shot("solved")
    # Solving one level of nine doesn't finish the game, so Kolibri shouldn't count it as done.
    game.expect_complete = False


def came_back(game):
    # The learner comes back: the first level has its tick and best number of moves.
    game.check(game.wait_for("!document.getElementById('btn-play').disabled"), "the game is ready again")
    game.click("#btn-play")
    first = game.text("#level-list button")
    game.check("✓" in first and "7" in first, "came back with level 1 solved: %s" % first.replace("\n", " "))
