(function () {
    "use strict";

    var roots = Array.prototype.slice.call(
        document.querySelectorAll("[data-bookstack-asciinema]")
    );
    var autoThemeRenderers = [];
    var themeObserver = null;

    function readConfig(root) {
        var node = root.querySelector("[data-bookstack-asciinema-config]");
        if (!node) return null;

        try {
            return JSON.parse(node.textContent);
        } catch (error) {
            console.error("Invalid asciinema configuration", error);
            return null;
        }
    }

    function isDarkMode() {
        return document.documentElement.hasAttribute("data-dark-mode");
    }

    function markFailed(root) {
        root.classList.add("is-failed");
        root.removeAttribute("aria-busy");
    }

    function normalizeMarkers(markers) {
        if (!Array.isArray(markers)) return markers;

        return markers.map(function (marker) {
            if (Array.isArray(marker)) return marker;
            return [marker.time, marker.label || ""];
        });
    }

    function initPlayer(root) {
        var target = root.querySelector("[data-bookstack-asciinema-player]");
        var config = readConfig(root);

        if (!window.AsciinemaPlayer || !target || !config) {
            markFailed(root);
            return;
        }

        var player = null;
        var renderId = 0;
        var content = root.closest(".main-content");
        var codeSample = content ? content.querySelector("pre code") : null;
        var fontFamily = window.getComputedStyle(codeSample || root).fontFamily;

        function mount(options, currentRenderId) {
            if (currentRenderId !== renderId) return;

            try {
                if (player) player.dispose();
                target.replaceChildren();
                player = window.AsciinemaPlayer.create(config.src, target, options);

                var timer = target.querySelector(".ap-timer");
                if (timer && !timer.getAttribute("aria-label")) {
                    timer.setAttribute(
                        "aria-label",
                        root.getAttribute("data-timer-label") || "播放时间"
                    );
                }

                root.classList.remove("is-failed");
                root.removeAttribute("aria-busy");
            } catch (error) {
                console.error("Unable to mount asciinema player", error);
                markFailed(root);
            }
        }

        function render() {
            var currentRenderId = ++renderId;
            var options = Object.assign({}, config.options);

            options.markers = normalizeMarkers(options.markers);
            options.theme = config.theme === "auto"
                ? (isDarkMode() ? "bookstack-dark" : "bookstack-light")
                : config.theme;

            if (fontFamily) {
                options.terminalFontFamily = fontFamily;
            }

            if (document.fonts && document.fonts.load && fontFamily) {
                try {
                    document.fonts.load("1em " + fontFamily).then(
                        function () { mount(options, currentRenderId); },
                        function () { mount(options, currentRenderId); }
                    );
                    return;
                } catch (error) {
                    // Fall through when the Font Loading API rejects the family.
                }
            }

            mount(options, currentRenderId);
        }

        render();

        if (config.theme === "auto") {
            autoThemeRenderers.push(render);
        }
    }

    function watchTheme() {
        if (!autoThemeRenderers.length) return;

        themeObserver = new MutationObserver(function (mutations) {
            if (mutations.some(function (mutation) {
                return mutation.attributeName === "data-dark-mode";
            })) {
                autoThemeRenderers.forEach(function (render) {
                    render();
                });
            }
        });

        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-dark-mode"]
        });
    }

    function init() {
        roots.forEach(initPlayer);
        watchTheme();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
