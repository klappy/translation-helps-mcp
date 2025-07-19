import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as fetchTranslationQuestionsHandler } from "./fetch-translation-questions";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing fetch-translation-questions API function
  const result = await fetchTranslationQuestionsHandler(event, context);
  return result as HandlerResponse;
};
