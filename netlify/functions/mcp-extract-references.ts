import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as extractReferencesHandler } from "./extract-references";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing extract-references API function
  const result = await extractReferencesHandler(event, context);
  return result as HandlerResponse;
};
