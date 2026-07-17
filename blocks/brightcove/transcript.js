export function getTranscript({
  showTranscript,
  openTranscriptIcon,
  closeTranscriptIcon,
  transcriptHTML,
  brightcove
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
    btnText.textContent = 'Open transcript';

    const toggleIcon = document.createElement('img');
    toggleIcon.src = openTranscriptIcon;
    toggleIcon.className = 'toggleIcon';
    toggleIcon.alt = 'open-close-icon';
    toggle.appendChild(toggleIcon);
    toggle.appendChild(btnText);


    const transcript = document.createElement('div');
    transcript.className = 'transcript';
    transcript.hidden = true;
    transcript.innerHTML = transcriptHTML;

    toggle.addEventListener('click', () => {
      transcript.hidden = !transcript.hidden;

      toggleIcon.src = transcript.hidden
        ? openTranscriptIcon
        : closeTranscriptIcon;

      btnText.textContent = transcript.hidden
        ? 'Open transcript'
        : 'Close transcript';
    });
    videoTranscript.append(toggle, transcript);
    brightcove.append(videoTranscript);
  }
}