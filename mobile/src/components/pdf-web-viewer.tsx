import { useMemo } from "react"
import { StyleSheet } from "react-native"
import { WebView, type WebViewMessageEvent } from "react-native-webview"

import { API_BASE_URL } from "@/lib/config"

/**
 * In-app PDF reader built on a WebView + pdf.js.
 *
 * Why not `react-native-pdf`? It is a native module, so it does not exist in
 * Expo Go, and a third-party native view can also fail under React Native 0.86's
 * New Architecture. `react-native-webview` is already a dependency, works in
 * Expo Go and every build, and pdf.js renders to a canvas — which means it also
 * works on Android, where a WebView cannot display a PDF on its own.
 *
 * The library and its worker are both served same-origin by the web app
 * (`/api/pdf-lib`, `/api/pdf-worker`), so nothing is bundled into the app and
 * the document fetch needs no CORS handling.
 *
 * Rendering is lazy (IntersectionObserver) so a long document does not allocate
 * every page canvas up front.
 */

export interface PdfWebViewerProps {
  url: string
  /** Fired once the document is parsed, with its page count. */
  onLoaded: (pages: number) => void
  /** Fired as the reader scrolls, with the page most in view. */
  onPage: (page: number) => void
  /** Fired for a parse/render/load failure. `message` is human-readable. */
  onError: (message: string) => void
}

export function PdfWebViewer({ url, onLoaded, onPage, onError }: PdfWebViewerProps) {
  const html = useMemo(() => buildPdfHtml(url), [url])

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string
        pages?: number
        page?: number
        message?: string
      }
      if (data.type === "loaded" && typeof data.pages === "number") {
        onLoaded(data.pages)
      } else if (data.type === "page" && typeof data.page === "number") {
        onPage(data.page)
      } else if (data.type === "error") {
        onError(data.message ?? "The document couldn't be rendered.")
      }
    } catch {
      // Ignore anything that isn't our JSON protocol.
    }
  }

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html, baseUrl: API_BASE_URL }}
      onMessage={handleMessage}
      onError={() => onError("Couldn't load the document viewer.")}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      overScrollMode="never"
      style={styles.webview}
    />
  )
}

/**
 * The reader page. Kept as a plain string with no template-literal
 * interpolation inside the embedded script, so nothing in the PDF's own markup
 * can break out of it.
 */
function buildPdfHtml(url: string): string {
  // `JSON.stringify` handles quotes/backslashes; escaping `<` stops a URL
  // containing `</script>` from terminating the block early.
  const safeUrl = JSON.stringify(url).replace(/</g, "\\u003c")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
<style>
  html, body { margin: 0; padding: 0; background: #F4F4F5; -webkit-text-size-adjust: 100%; }
  #pages { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 12px; }
  .page { background: #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.12); border-radius: 4px; overflow: hidden; width: 100%; max-width: 900px; }
  .page canvas { display: block; width: 100%; height: auto; }
  .ph { height: 320px; display: flex; align-items: center; justify-content: center; color: #A1A1AA; font: 13px -apple-system, system-ui, sans-serif; }
  #status { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: #F4F4F5; color: #52525B; font: 14px -apple-system, system-ui, sans-serif; text-align: center; padding: 24px; }
  .spin { width: 30px; height: 30px; border: 3px solid #E4E4E7; border-top-color: #0891B2; border-radius: 50%; animation: s 0.8s linear infinite; }
  @keyframes s { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div id="status"><div class="spin"></div><div>Loading document&hellip;</div></div>
<div id="pages"></div>
<script type="module">
  var PDF_URL = ${safeUrl};

  function post(type, extra) {
    var payload = Object.assign({ type: type }, extra || {});
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  function fail(message) {
    post("error", { message: message });
    var st = document.getElementById("status");
    if (st) {
      st.style.display = "flex";
      st.innerHTML = "<div>" + message + "</div>";
    }
  }

  (async function () {
    try {
      var pdfjsLib = await import("/api/pdf-lib");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";

      var doc = await pdfjsLib.getDocument({ url: PDF_URL }).promise;
      post("loaded", { pages: doc.numPages });

      var status = document.getElementById("status");
      if (status) status.style.display = "none";

      var container = document.getElementById("pages");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      function renderPage(n, holder) {
        if (holder.getAttribute("data-done") === "1") return;
        holder.setAttribute("data-done", "1");
        doc.getPage(n).then(function (page) {
          var base = page.getViewport({ scale: 1 });
          var maxWidth = Math.min(window.innerWidth - 24, 900);
          var viewport = page.getViewport({ scale: maxWidth / base.width });
          var canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          var ctx = canvas.getContext("2d");
          holder.innerHTML = "";
          holder.appendChild(canvas);
          page.render({
            canvasContext: ctx,
            viewport: viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
          }).promise.catch(function () {
            holder.innerHTML = '<div class="ph">Page ' + n + " failed to render</div>";
          });
        }).catch(function () {
          holder.innerHTML = '<div class="ph">Page ' + n + " failed to load</div>";
        });
      }

      var pageObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            renderPage(Number(entry.target.getAttribute("data-page")), entry.target);
          }
        });
      }, { rootMargin: "600px 0px" });

      var currentObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            post("page", { page: Number(entry.target.getAttribute("data-page")) });
          }
        });
      }, { threshold: 0.5 });

      for (var n = 1; n <= doc.numPages; n++) {
        var holder = document.createElement("div");
        holder.className = "page";
        holder.setAttribute("data-page", String(n));
        holder.innerHTML = '<div class="ph">Page ' + n + "</div>";
        container.appendChild(holder);
        pageObserver.observe(holder);
        currentObserver.observe(holder);
      }
    } catch (err) {
      var message = (err && err.message) ? err.message : String(err);
      if (/password/i.test(message)) {
        fail("This PDF is password-protected, so it can only be opened in a browser.");
      } else {
        fail("Couldn't render this PDF here.");
      }
    }
  })();
</script>
</body>
</html>`
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: "#F4F4F5" },
})
