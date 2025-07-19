import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as fetchTranslationNotesHandler } from "./fetch-translation-notes";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing fetch-translation-notes API function
  const result = await fetchTranslationNotesHandler(event, context);
  return result as HandlerResponse;
};
