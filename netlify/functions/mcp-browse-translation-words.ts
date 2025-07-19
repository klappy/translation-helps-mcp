import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as browseTranslationWordsHandler } from "./browse-translation-words";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing browse-translation-words API function
  const result = await browseTranslationWordsHandler(event, context);
  return result as HandlerResponse;
};
