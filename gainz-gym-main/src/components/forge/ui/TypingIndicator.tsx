import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COACH_LOADING_MESSAGES } from "@/lib/design-tokens";

export function TypingIndicator() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % COACH_LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="bubble bubble-assistant coach-typing"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="typing-dots" aria-hidden>
        <span /><span /><span />
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={msgIdx}
          className="typing-msg"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {COACH_LOADING_MESSAGES[msgIdx]}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="coach-skeleton" aria-hidden>
      <div className="skel-row skel-assistant"><div className="skel-bubble skel-w75" /></div>
      <div className="skel-row skel-user"><div className="skel-bubble skel-w60" /></div>
      <div className="skel-row skel-assistant"><div className="skel-bubble skel-w85" /></div>
    </div>
  );
}
