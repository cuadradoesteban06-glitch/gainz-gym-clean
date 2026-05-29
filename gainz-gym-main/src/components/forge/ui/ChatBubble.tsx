import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ChatBubbleProps = {
  role: "user" | "assistant";
  children: React.ReactNode;
  index?: number;
};

export function ChatBubble({ role, children, index = 0 }: ChatBubbleProps) {
  return (
    <motion.div
      className={cn("bubble", role === "user" ? "bubble-user" : "bubble-assistant")}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index * 0.04, 0.2),
        ease: [0.22, 1, 0.36, 1],
      }}
      layout
    >
      {children}
    </motion.div>
  );
}

export function ChatMessageContent({ content }: { content: string }) {
  return (
    <>
      {content.split("\n").map((line, i) => (
        <p key={i} style={{ margin: i ? "8px 0 0" : 0 }}>
          {line}
        </p>
      ))}
    </>
  );
}
