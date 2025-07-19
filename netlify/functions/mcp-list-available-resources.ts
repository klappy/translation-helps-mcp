import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as listAvailableResourcesHandler } from "./list-available-resources";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing list-available-resources API function
  const result = await listAvailableResourcesHandler(event, context);
  return result as HandlerResponse;
};
