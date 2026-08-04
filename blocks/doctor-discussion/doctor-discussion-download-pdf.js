/**
 * @param {Object} config - Configuration object.
 * @param {string} config.apiUrl - API endpoint used to generate the PDF.
 * @param {HTMLButtonElement} [config.button] - Download button (optional).
 *                                             Used to show loading state and disable multiple clicks.
 * @param {string} [config.errorElementId='pdf-error-msg'] - ID of the generic error message container.
 * @param {string} [config.popupBlockedElementId='dg-pdf-popup-blocked'] - ID of the container shown
 *                 when the browser blocks the auto-opened tab. Must contain an <a> element (or be one)
 *                 that the controller can point at the generated PDF for the user to click manually.
 *
 * @returns {{ download: (quizData: unknown) => Promise<void> }}
 *          Returns an object exposing the download() function.
 */
export default function createPdfDownloadController({
  apiUrl,
  button,
  errorElementId = 'pdf-error-msg',
  popupBlockedElementId = 'dg-pdf-popup-blocked',
} = {}) {
  // Indicates whether a download request is currently in progress. Prevents duplicate API requests if the user clicks multiple times.

  let isLoading = false;

  // Stores the previously created object URL.

  let lastObjectUrl = null;

  /**
   * Shows or hides the PDF download error message.
   *
   * @param {boolean} visible - True to show the error, false to hide it.
   */
  function setError(visible) {
    const errorContainer = document.getElementById(errorElementId);

    if (errorContainer) {
      errorContainer.classList.toggle('d-none', !visible);
    }
  }

  /**
   * Shows/hides the popup-blocked fallback UI and points its link at
   * the generated PDF, so a real click can open it (unlike window.open()
   * after an async fetch, which browsers block).
   *
   * @param {boolean} visible
   * @param {string} [url] - Object URL for the generated PDF.
   */
  function setPopupBlocked(visible, url) {
    const container = document.getElementById(popupBlockedElementId);
    if (!container) return;

    container.classList.toggle('d-none', !visible);

    if (visible && url) {
      const link = container.tagName === 'A' ? container : container.querySelector('a');
      if (link) {
        link.href = url;
        link.setAttribute('download', 'doctor-discussion-guide.pdf');
      }
    }
  }

  /**
   * Updates the loading state.
   * - Disables the download button while the request is running.
   * - Adds/removes a CSS loading class.
   * @param {boolean} loading
   */
  function setLoading(loading) {
    isLoading = loading;

    if (button) {
      button.disabled = loading;
      button.classList.toggle('is-loading', loading);
    }
  }

  /**
   * Generates and downloads the PDF.
   * @param {Object} quizData - Quiz/form data sent to the PDF API.
   */
  async function download(quizData) {
    // Ignore repeated clicks while a request is already running.
    if (isLoading) return;

    // Hide any previous error/fallback messages.
    setError(false);
    setPopupBlocked(false);

    // Enable loading state.
    setLoading(true);

    // Open a blank browser tab immediately, synchronously, in direct response to the click.
    const pdfWindow = window.open('', '_blank');

    // If pdfWindow is null here, the popup was blocked.
    const popupWasBlocked = !pdfWindow;

    try {
      // Send quiz data to the PDF generation API.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quizData),
      });

      // Ensure the server returned a successful response.

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      // Validate that the response is actually a PDF.

      const contentType = response.headers.get('Content-Type') || '';

      if (!contentType.includes('application/pdf')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      // Convert the response into a Blob.

      const blob = await response.blob();

      // Ensure the PDF is not empty.

      if (!blob || blob.size === 0) {
        throw new Error('Received empty PDF from server');
      }

      // Revoke the previously created object URL (if any) to avoid memory leaks.

      if (lastObjectUrl) {
        URL.revokeObjectURL(lastObjectUrl);
      }

      // Create a temporary browser URL pointing to the PDF blob.

      lastObjectUrl = URL.createObjectURL(blob);

      if (popupWasBlocked) {
        setPopupBlocked(true, lastObjectUrl);
      } else {
        // Navigate the already-opened tab to the generated PDF.
        pdfWindow.location.href = lastObjectUrl;
      }

      const urlToRevoke = lastObjectUrl;
      const revokeDelay = popupWasBlocked ? 5 * 60000 : 60000;

      setTimeout(() => {
        URL.revokeObjectURL(urlToRevoke);
      }, revokeDelay);
    } catch (error) {
      document.dispatchEvent(new CustomEvent('dg:pdf-error', { bubbles: true, detail: { error } }));

      if (pdfWindow) {
        pdfWindow.close();
      }

      setError(true);
    } finally {
      // Always reset the loading state,regardless of success or failure.

      setLoading(false);
    }
  }

  // Public API exposed by this controller.

  return {
    download,
  };
}