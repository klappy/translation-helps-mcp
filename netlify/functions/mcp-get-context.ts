import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as getContextHandler } from "./get-context";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing get-context API function
  const result = await getContextHandler(event, context);
  return result as HandlerResponse;
};
