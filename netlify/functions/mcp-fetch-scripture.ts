import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as fetchScriptureHandler } from "./fetch-scripture";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing fetch-scripture API function
  const result = await fetchScriptureHandler(event, context);
  return result as HandlerResponse;
};
