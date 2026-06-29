import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success", duration: number = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {}
      <div 
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        role="live"
        aria-live="assertive"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
            let borderClass = "border-emerald-500/20";
            let shadowClass = "shadow-emerald-500/5";
            const bgClass = "bg-slate-900";

            if (toast.type === "error") {
              icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
              borderClass = "border-rose-500/20";
              shadowClass = "shadow-rose-500/5";
            } else if (toast.type === "warning") {
              icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
              borderClass = "border-amber-500/20";
              shadowClass = "shadow-amber-500/5";
            } else if (toast.type === "info") {
              icon = <Info className="w-5 h-5 text-slate-300 shrink-0" />;
              borderClass = "border-indigo-500/20";
              shadowClass = "shadow-indigo-500/5";
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${borderClass} ${bgClass} shadow-sm ${shadowClass} backdrop-`}
              >
                {icon}
                <div className="flex-1 text-xs font-medium text-slate-100 leading-normal select-none">
                  {toast.message}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-200 transition p-0.5 rounded-lg hover:bg-slate-800"
                  aria-label="Dismiss Notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
