import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as fetchTranslationWordsHandler } from "./fetch-translation-words";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing fetch-translation-words API function
  const result = await fetchTranslationWordsHandler(event, context);
  return result as HandlerResponse;
};
