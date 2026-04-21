/**
 * version.js
 * 
 * Gerenciamento global da versão do site (BR ou JP).
 * Inclua este script em todas as páginas, ANTES de qualquer
 * outro script que dependa da variável de versão.
 * 
 * Exemplo de uso:
 *   <script src="version.js"></script>
 * 
 * Variável global exposta:
 *   window.SITE_VERSION  →  "BR" | "JP"
 * 
 * Funções globais expostas:
 *   SiteVersion.get()           → retorna "BR" ou "JP"
 *   SiteVersion.set(v)          → define a versão manualmente e recarrega
 *   SiteVersion.detect(cb)      → detecta via geolocalização e chama cb(version)
 *   SiteVersion.init(cb)        → inicializa: lê localStorage ou detecta, chama cb(version)
 *   SiteVersion.otherVersion()  → retorna a versão oposta à atual
 *   SiteVersion.switchPage()    → troca de versão e redireciona para a página equivalente
 */

(function () {

    var STORAGE_KEY = 'site-version';
    var TIMEOUT_MS  = 3000;
    var ASIA = [
        "BD","IO","BT","BN","KH","CN","CC","HK","IN","ID",
        "JP","LA","MO","MY","MN","MM","NP","KP","PK","PH",
        "SG","KR","LK","TW","TH","VN","YE"
    ];

    // Mapa: página atual → equivalente na outra versão
    var PAGE_MAP = {
        BR: {
            'indexBR.html' : 'indexJP.html',
            'about.html'   : 'aboutJP.html',
            'aboutJP.html' : 'aboutJP.html'   // fallback
        },
        JP: {
            'indexJP.html' : 'indexBR.html',
            'aboutJP.html' : 'about.html',
            'about.html'   : 'about.html'      // fallback
        }
    };

    // ── Utilitários internos ──────────────────────────────

    function _read() {
        try { return localStorage.getItem(STORAGE_KEY); } catch(e) { return null; }
    }

    function _write(v) {
        try { localStorage.setItem(STORAGE_KEY, v); } catch(e) {}
    }

    function _currentFile() {
        return window.location.pathname.split('/').pop() || 'indexBR.html';
    }

    // ── API pública ───────────────────────────────────────

    var SiteVersion = {

        /**
         * Retorna a versão ativa ("BR" ou "JP").
         * Lê de window.SITE_VERSION (definido pelo init).
         */
        get: function () {
            return window.SITE_VERSION || _read() || 'BR';
        },

        /**
         * Define a versão manualmente, persiste no localStorage
         * e recarrega a página equivalente.
         */
        set: function (v) {
            v = (v === 'JP') ? 'JP' : 'BR';
            _write(v);
            window.SITE_VERSION = v;
        },

        /** Retorna a versão oposta à atual. */
        otherVersion: function () {
            return this.get() === 'BR' ? 'JP' : 'BR';
        },

        /**
         * Detecta a versão via API de geolocalização.
         * Chama cb(version) ao terminar (ou após timeout).
         */
        detect: function (cb) {
            var done = false;

            var timer = setTimeout(function () {
                if (!done) { done = true; cb('BR'); }
            }, TIMEOUT_MS);

            fetch('https://geolocation-db.com/json/')
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    var code = (data.country_code || '').toUpperCase();
                    cb(ASIA.indexOf(code) !== -1 ? 'JP' : 'BR');
                })
                .catch(function () {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    cb('BR');
                });
        },

        /**
         * Inicializa a versão:
         *  1. Se já existe preferência salva → usa ela imediatamente.
         *  2. Caso contrário → detecta via geolocalização.
         * Ao resolver, define window.SITE_VERSION, persiste e chama cb(version).
         */
        init: function (cb) {
            var saved = _read();

            if (saved === 'BR' || saved === 'JP') {
                window.SITE_VERSION = saved;
                if (cb) cb(saved);
                return;
            }

            this.detect(function (v) {
                _write(v);
                window.SITE_VERSION = v;
                if (cb) cb(v);
            });
        },

        /**
         * Troca para a versão oposta, salva a preferência
         * e redireciona para a página equivalente.
         */
        switchPage: function () {
            var next     = this.otherVersion();
            var file     = _currentFile();
            var map      = PAGE_MAP[next] || {};
            var target   = map[file] || (next === 'JP' ? 'indexJP.html' : 'indexBR.html');

            this.set(next);
            window.location.href = target;
        }
    };

    // Expõe globalmente
    window.SiteVersion  = SiteVersion;

    // Define SITE_VERSION sincronicamente se já houver preferência salva,
    // para que scripts inline que rodam antes do init() já tenham acesso.
    var saved = _read();
    if (saved === 'BR' || saved === 'JP') {
        window.SITE_VERSION = saved;
    }

})();