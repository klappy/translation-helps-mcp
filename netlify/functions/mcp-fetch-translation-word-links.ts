import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as fetchTranslationWordLinksHandler } from "./fetch-translation-word-links";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing fetch-translation-word-links API function
  const result = await fetchTranslationWordLinksHandler(event, context);
  return result as HandlerResponse;
};
