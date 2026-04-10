/* Global Calls State */
import { ref } from "vue";
import { useEventBus } from "@vueuse/core";

// Define outside the composable to ensure a single shared instance globally
const incomingCalls = ref([]);

export const useCalls = () => {
  const answerBus = useEventBus("answer-call");
  const declineBus = useEventBus("decline-call");

  return {
    incomingCalls,
    answerBus,
    declineBus,
  };
};
