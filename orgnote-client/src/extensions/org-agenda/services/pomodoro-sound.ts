const BEEP_FREQUENCY_HZ = 880;
const BEEP_INITIAL_GAIN = 0.3;
const BEEP_END_GAIN = 0.001;
const BEEP_DURATION_SECONDS = 0.8;

export const playPomodoroBeep = (): void => {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.frequency.value = BEEP_FREQUENCY_HZ;
  gain.gain.setValueAtTime(BEEP_INITIAL_GAIN, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    BEEP_END_GAIN,
    context.currentTime + BEEP_DURATION_SECONDS,
  );
  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + BEEP_DURATION_SECONDS);
  oscillator.onended = () => void context.close();
};
