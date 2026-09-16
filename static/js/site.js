/**
 * site.js
 * Page behaviour for the personal site:
 *   theme switch, mobile navigation, nav scroll state, scroll spy,
 *   config.yml + markdown content loading, scroll reveal.
 */
(function () {
    'use strict';

    var CONTENT_DIR = 'contents/';
    var NAV_OFFSET = 68;
    var REVEAL_SELECTOR = '.hero-copy, .hero-visual, .band, .section-head, .about-lead, ' +
        '.capability, .fact, .panel, .award, .project';
    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var doc = document;

    /* ---------------------------------------------------------------- utils */
    function fetchText(url) {
        return fetch(url).then(function (response) {
            if (!response.ok) {
                throw new Error(url + ' -> HTTP ' + response.status);
            }
            return response.text();
        });
    }

    function setText(id, value) {
        var el = doc.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    /* ---------------------------------------------------------------- theme */
    function initTheme() {
        var btn = doc.getElementById('themeToggle');
        if (!btn) {
            return;
        }
        var icon = btn.querySelector('i');
        var label = btn.querySelector('.theme-toggle-label');

        function sync() {
            var dark = doc.documentElement.getAttribute('data-theme') === 'dark';
            btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
            if (icon) {
                icon.className = dark ? 'ph ph-sun' : 'ph ph-moon';
            }
            if (label) {
                label.textContent = dark ? 'Light' : 'Dark';
            }
        }

        btn.addEventListener('click', function () {
            var next = doc.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            doc.documentElement.setAttribute('data-theme', next);
            try {
                localStorage.setItem('theme', next);
            } catch (e) { /* storage unavailable */ }
            sync();
        });

        sync();
    }

    /* ------------------------------------------------------------ navigation */
    var scrollSpy = null;
    function initNav() {
        var nav = doc.getElementById('mainNav');
        var toggle = doc.getElementById('navToggle');
        var menu = doc.getElementById('navMenu');

        if (toggle && menu) {
            toggle.addEventListener('click', function () {
                var open = menu.classList.toggle('is-open');
                toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });

            menu.addEventListener('click', function (event) {
                if (event.target.closest('.nav-link') && menu.classList.contains('is-open')) {
                    menu.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });

            doc.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && menu.classList.contains('is-open')) {
                    menu.classList.remove('is-open');
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.focus();
                }
            });
        }

        if (!nav || !('IntersectionObserver' in window)) {
            return;
        }

        var band = doc.querySelector('.band-wrap');
        if (band) {
            new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    nav.classList.toggle('is-scrolled', entry.boundingClientRect.top < 0);
                });
            }, { rootMargin: '-' + NAV_OFFSET + 'px 0px 0px 0px', threshold: 0 }).observe(band);
        }

    }

    function initScrollSpy() {
        if (!('IntersectionObserver' in window)) {
            return;
        }
        // Sections without their own navigation entry still drive the active
        // state of the entry they belong to (the About block belongs to Home).
        var SPY_ALIASES = { '#page-top': ['#home'] };

        var links = [].slice.call(doc.querySelectorAll('.nav-menu .nav-link'));
        var targets = [];

        links.forEach(function (link) {
            var href = link.getAttribute('href');
            [href].concat(SPY_ALIASES[href] || []).forEach(function (anchor) {
                var el = doc.getElementById(anchor.slice(1));
                if (el) {
                    targets.push({ link: link, el: el });
                }
            });
        });

        if (!targets.length) {
            return;
        }

        // Activation line sits just below the sticky nav plus the scroll padding,
        // so an anchored section counts as current the moment it lands there.
        var LINE = NAV_OFFSET + 32;
        var current = null;

        function activate(item) {
            if (current === item) {
                return;
            }
            targets.forEach(function (entry) {
                entry.link.classList.toggle('is-active', entry === item);
            });
            current = item;
        }

        function update() {
            var winner = null;
            var closest = null;
            var closestDistance = Infinity;

            targets.forEach(function (item) {
                var rect = item.el.getBoundingClientRect();
                item.rect = rect;
                if (rect.top <= LINE && rect.bottom > LINE) {
                    winner = item;
                }
                var distance = Math.abs(rect.top - LINE);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closest = item;
                }
            });

            var next = winner || closest;
            if (next) {
                activate(next);
            }
        }

        var observer = new IntersectionObserver(update, {
            rootMargin: '-' + (NAV_OFFSET + 8) + 'px 0px -45% 0px',
            threshold: 0
        });

        targets.forEach(function (item) {
            observer.observe(item.el);
        });

        update();
        scrollSpy = { update: update };

        // Content loads asynchronously (config + markdown), so the document grows
        // after the first calculation: recalculate whenever the page is resized.
        if (window.ResizeObserver) {
            var pending = false;
            var resizeObserver = new ResizeObserver(function () {
                if (pending) {
                    return;
                }
                pending = true;
                window.requestAnimationFrame(function () {
                    pending = false;
                    update();
                });
            });
            resizeObserver.observe(doc.body);
        }
    }

    /* -------------------------------------------------------------- content */
    function loadConfig() {
        if (typeof jsyaml === 'undefined') {
            console.warn('js-yaml is unavailable; configuration was not applied.');
            return Promise.resolve();
        }
        return fetchText(CONTENT_DIR + 'config.yml')
            .then(function (text) {
                var yml = jsyaml.load(text) || {};
                Object.keys(yml).forEach(function (key) {
                    var value = yml[key] === null || yml[key] === undefined ? '' : String(yml[key]);
                    if (key === 'title') {
                        doc.title = value;
                        return;
                    }
                    setText(key, value);
                });
            })
            .catch(function (error) {
                console.warn('config.yml could not be loaded:', error);
            });
    }

    function renderMarkdown(container, markdown) {
        try {
            container.innerHTML = marked.parse(markdown);
        } catch (error) {
            console.warn('markdown parse failed:', error);
        }
    }

    function loadDocuments() {
        var sections = [].slice.call(doc.querySelectorAll('[data-doc]'));
        return Promise.all(sections.map(function (container) {
            var name = container.getAttribute('data-doc');
            return fetchText(CONTENT_DIR + name + '.md')
                .then(function (markdown) {
                    renderMarkdown(container, markdown);
                })
                .catch(function (error) {
                    console.warn('content ' + name + ' could not be loaded:', error);
                    container.innerHTML = '<p>Content is unavailable right now.</p>';
                });
        }));
    }

    function typesetMath() {
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise().catch(function (error) {
                console.warn('MathJax typeset failed:', error);
            });
        }
    }

    // Deep links land before the async content is in place, so the browser jumps
    // to the anchor of a still-collapsed page. Re-align once content has loaded.
    function alignToHash() {
        var hash = window.location.hash;
        if (!hash || hash.length < 2) {
            return;
        }
        var el = doc.getElementById(hash.slice(1));
        if (!el) {
            return;
        }
        if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'start' });
        }
    }

    /* --------------------------------------------------------------- reveal */
    var revealObserver = null;

    function initReveal() {
        if (reduceMotion || !('IntersectionObserver' in window)) {
            return;
        }

        revealObserver = new IntersectionObserver(function (entries, observer) {
            var batch = entries.filter(function (entry) {
                return entry.isIntersecting;
            });
            batch.forEach(function (entry, index) {
                entry.target.style.transitionDelay = (index * 70) + 'ms';
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
    }

    function tagReveals(root) {
        if (!revealObserver || !root) {
            return;
        }
        var nodes = [];
        if (root.nodeType === 1 && root.matches(REVEAL_SELECTOR)) {
            nodes.push(root);
        }
        nodes = nodes.concat([].slice.call(root.querySelectorAll ? root.querySelectorAll(REVEAL_SELECTOR) : []));

        nodes.forEach(function (el) {
            if (el.hasAttribute('data-reveal')) {
                return;
            }
            el.setAttribute('data-reveal', '');
            revealObserver.observe(el);
        });
    }

    function watchNewContent() {
        if (!revealObserver || !window.MutationObserver) {
            return;
        }
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                [].slice.call(mutation.addedNodes).forEach(function (node) {
                    if (node.nodeType === 1) {
                        tagReveals(node);
                    }
                });
            });
        });
        observer.observe(doc.body, { childList: true, subtree: true });
    }

    /* ------------------------------------------------------------- bootstrap */
    function start() {
        initTheme();
        initNav();
        initScrollSpy();
        initReveal();
        tagReveals(doc.body);
        watchNewContent();

        Promise.all([loadConfig(), loadDocuments()])
            .then(function () {
                tagReveals(doc.body);
                alignToHash();
                if (scrollSpy) {
                    scrollSpy.update();
                }
                typesetMath();
            })
            .catch(function (error) {
                console.warn('content bootstrap failed:', error);
                typesetMath();
            });
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
