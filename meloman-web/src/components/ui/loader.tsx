import { motion } from "motion/react"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  text?: string
}

export function Loader({ size = "md", text }: LoaderProps) {
  const sizeMap = {
    sm: { container: "h-20", dot: "h-2 w-2", text: "text-xs" },
    md: { container: "h-32", dot: "h-3 w-3", text: "text-sm" },
    lg: { container: "h-48", dot: "h-4 w-4", text: "text-base" },
  }

  const dimensions = sizeMap[size]

  return (
    <div className={`flex flex-col items-center justify-center ${dimensions.container} gap-4`}>
      <div className="flex gap-2">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${dimensions.dot} rounded-full`}
            style={{ backgroundColor: 'var(--accent-color, #3b82f6)' }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.15,
            }}
          />
        ))}
      </div>
      {text && (
        <motion.p
          className={`text-gray-400 ${dimensions.text}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

interface FullScreenLoaderProps {
  text?: string
}

export function FullScreenLoader({ text = "Loading..." }: FullScreenLoaderProps) {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader size="lg" text={text} />
    </div>
  )
}
