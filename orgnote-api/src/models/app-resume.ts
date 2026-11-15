export type ResumeHandler = () => void | Promise<void>;

export type StopHandle = () => void;

export type UseAppResume = (onResume: ResumeHandler) => StopHandle;
