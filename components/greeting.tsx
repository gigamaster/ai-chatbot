import { motion } from "framer-motion";
import { Globe } from "@/components/globe";

export const Greeting = () => {
  return (
    <div className="block h-[570px] mx-auto">
      <div
        className="relative z-1 flex size-full max-w-3xl flex-col justify-start mx-auto mt-16"
        key="overview"
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="font-semibold text-xl md:text-2xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.5 }}
        >
          Welcome to AI Chatbot of Codemo Digital Nomad!
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-xl text-zinc-400 md:text-2xl"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.6 }}
        >
          How can I help you today?
        </motion.div>
      </div>
      <div className="absolute -mt-16 inset-0 z-0 flex items-center justify-center">
        <Globe
          backgroundColor="transparent"
          className=""
          globeColor="#41627c"
          glowColor="#41627c"
          height={640}
          markerColor="#FACE74"
          opacity={0.74}
          speed={0.005}
          width={640}
        />
      </div>
    </div>
  );
};
