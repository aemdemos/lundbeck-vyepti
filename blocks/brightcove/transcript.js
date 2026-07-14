export function getTranscript({
  showTranscript,
  openTranscriptIcon,
  closeTranscriptIcon,
  transcriptHTML,
  brightcove,
}) {
    if (
    showTranscript?.toLowerCase() === 'yes' &&
    transcriptHTML?.trim()
    ) {

    // Creattion of Transcript wrapper 
    const videoTranscript = document.createElement('div');
    videoTranscript.className = "video-transcript";

    // Creation of Transcript DIV
    const toggle = document.createElement('div');
    toggle.className = 'transcript-toggle';

    const btnText = document.createElement('span');
    btnText.textContent = 'Open Transcript';

    toggle.innerHTML = openTranscriptIcon;
    toggle.appendChild(btnText);


    const transcript = document.createElement('div');
    transcript.className = 'transcript';
    transcript.hidden = true;
    transcript.innerHTML = transcriptHTML;

    toggle.addEventListener('click', () => {
      transcript.hidden = !transcript.hidden;
      toggle.innerHTML = transcript.hidden
        ? openTranscriptIcon
        : closeTranscriptIcon;
      btnText.textContent = transcript.hidden
        ? 'Open Transcript'
        : 'Close Transcript';
      toggle.appendChild(btnText);
    });
    videoTranscript.append(toggle, transcript);
    brightcove.append(videoTranscript);
  }
}