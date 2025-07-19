import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as getWordsForReferenceHandler } from "./get-words-for-reference";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing get-words-for-reference API function
  const result = await getWordsForReferenceHandler(event, context);
  return result as HandlerResponse;
};
