import * as placesService from "./places-service";

export interface ZekeActionResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface PlaceSearchAction {
  type: "search_places";
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  placeType?: string;
}

export interface CreatePlaceListAction {
  type: "create_place_list";
  name: string;
  description?: string;
  hasProximityAlert?: boolean;
  proximityRadiusMeters?: number;
  proximityMessage?: string;
}

export interface AddPlaceToListAction {
  type: "add_place_to_list";
  listId?: string;
  listName?: string;
  placeId?: string;
  nearbyPlace?: placesService.NearbyPlace;
}

export interface SearchAndAddToListAction {
  type: "search_and_add_to_list";
  query: string;
  listId?: string;
  listName?: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  createListIfNotExists?: boolean;
}

export interface SetListProximityAlertAction {
  type: "set_list_proximity_alert";
  listId?: string;
  listName?: string;
  enabled: boolean;
  radiusMeters?: number;
  message?: string;
}

export type ZekeAction =
  | PlaceSearchAction
  | CreatePlaceListAction
  | AddPlaceToListAction
  | SearchAndAddToListAction
  | SetListProximityAlertAction;

function findListByName(name: string): placesService.PlaceList | null {
  const lists = placesService.getAllPlaceLists();
  const normalizedName = name.toLowerCase().trim();
  return lists.find((l) => l.name.toLowerCase().trim() === normalizedName) || null;
}

export async function executeAction(action: ZekeAction): Promise<ZekeActionResult> {
  try {
    switch (action.type) {
      case "search_places":
        return await handleSearchPlaces(action);
      case "create_place_list":
        return handleCreatePlaceList(action);
      case "add_place_to_list":
        return handleAddPlaceToList(action);
      case "search_and_add_to_list":
        return await handleSearchAndAddToList(action);
      case "set_list_proximity_alert":
        return handleSetListProximityAlert(action);
      default:
        return { success: false, message: "Unknown action type" };
    }
  } catch (error) {
    console.error("[ZEKE Actions] Error executing action:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Action failed",
    };
  }
}

async function handleSearchPlaces(action: PlaceSearchAction): Promise<ZekeActionResult> {
  const result = await placesService.searchNearbyPlaces(
    action.query,
    action.latitude,
    action.longitude,
    action.radiusMeters || 8000,
    action.placeType
  );

  if (result.places.length === 0) {
    return {
      success: true,
      message: `No places found for "${action.query}" within ${Math.round((action.radiusMeters || 8000) / 1000)} km`,
      data: { places: [] },
    };
  }

  return {
    success: true,
    message: `Found ${result.places.length} places for "${action.query}"`,
    data: result,
  };
}

function handleCreatePlaceList(action: CreatePlaceListAction): ZekeActionResult {
  const existing = findListByName(action.name);
  if (existing) {
    return {
      success: false,
      message: `A list named "${action.name}" already exists`,
      data: { list: existing },
    };
  }

  const list = placesService.createPlaceList({
    name: action.name,
    description: action.description,
    placeIds: [],
    hasProximityAlert: action.hasProximityAlert || false,
    proximityRadiusMeters: action.proximityRadiusMeters,
    proximityMessage: action.proximityMessage,
  });

  return {
    success: true,
    message: `Created place list "${list.name}"`,
    data: { list },
  };
}

function handleAddPlaceToList(action: AddPlaceToListAction): ZekeActionResult {
  let list: placesService.PlaceList | null = null;

  if (action.listId) {
    list = placesService.getPlaceList(action.listId);
  } else if (action.listName) {
    list = findListByName(action.listName);
  }

  if (!list) {
    return {
      success: false,
      message: action.listName
        ? `List "${action.listName}" not found`
        : "List not found",
    };
  }

  if (!action.placeId && !action.nearbyPlace) {
    return { success: false, message: "No place specified to add" };
  }

  const placeId = action.placeId || action.nearbyPlace?.placeId;
  if (!placeId) {
    return { success: false, message: "Invalid place ID" };
  }

  const updated = placesService.addPlaceToList(list.id, placeId);
  if (!updated) {
    return { success: false, message: "Failed to add place to list" };
  }

  return {
    success: true,
    message: `Added place to "${list.name}"`,
    data: { list: updated },
  };
}

async function handleSearchAndAddToList(action: SearchAndAddToListAction): Promise<ZekeActionResult> {
  let list: placesService.PlaceList | null = null;

  if (action.listId) {
    list = placesService.getPlaceList(action.listId);
  } else if (action.listName) {
    list = findListByName(action.listName);
  }

  if (!list && action.createListIfNotExists && action.listName) {
    list = placesService.createPlaceList({
      name: action.listName,
      placeIds: [],
      hasProximityAlert: true,
      proximityRadiusMeters: 500,
      proximityMessage: `You're near a ${action.listName.toLowerCase()} location`,
    });
  }

  if (!list) {
    return {
      success: false,
      message: action.listName
        ? `List "${action.listName}" not found. Would you like me to create it?`
        : "No list specified",
    };
  }

  const searchResult = await placesService.searchNearbyPlaces(
    action.query,
    action.latitude,
    action.longitude,
    action.radiusMeters || 8000
  );

  if (searchResult.places.length === 0) {
    return {
      success: true,
      message: `No places found for "${action.query}". The list "${list.name}" was not updated.`,
      data: { list, placesAdded: 0 },
    };
  }

  let addedCount = 0;
  for (const place of searchResult.places) {
    if (!list.placeIds.includes(place.placeId)) {
      placesService.addPlaceToList(list.id, place.placeId);
      addedCount++;
    }
  }

  const updatedList = placesService.getPlaceList(list.id);

  return {
    success: true,
    message: `Found ${searchResult.places.length} ${action.query} locations and added ${addedCount} new places to "${list.name}"`,
    data: {
      list: updatedList,
      placesFound: searchResult.places.length,
      placesAdded: addedCount,
      places: searchResult.places,
    },
  };
}

function handleSetListProximityAlert(action: SetListProximityAlertAction): ZekeActionResult {
  let list: placesService.PlaceList | null = null;

  if (action.listId) {
    list = placesService.getPlaceList(action.listId);
  } else if (action.listName) {
    list = findListByName(action.listName);
  }

  if (!list) {
    return {
      success: false,
      message: action.listName
        ? `List "${action.listName}" not found`
        : "List not found",
    };
  }

  const updated = placesService.updatePlaceList(list.id, {
    hasProximityAlert: action.enabled,
    proximityRadiusMeters: action.radiusMeters || list.proximityRadiusMeters,
    proximityMessage: action.message || list.proximityMessage,
  });

  if (!updated) {
    return { success: false, message: "Failed to update list" };
  }

  const status = action.enabled ? "enabled" : "disabled";
  return {
    success: true,
    message: `Proximity alerts ${status} for "${list.name}"${action.enabled && action.radiusMeters ? ` (${action.radiusMeters}m radius)` : ""}`,
    data: { list: updated },
  };
}

export function parseConversationIntent(
  message: string,
  userLocation?: { latitude: number; longitude: number }
): ZekeAction | null {
  const lowerMessage = message.toLowerCase().trim();

  // Pattern 1: Search for places nearby
  // Examples: "find plumbing supply stores nearby", "search for coffee shops near me", "show me restaurants around here"
  const searchPatterns = [
    /(?:find|search|look for|get|show me|locate|where (?:are|is))\s+(?:all\s+)?(?:the\s+)?(.+?)\s+(?:stores?|shops?|places?|locations?|businesses?|near(?:by)?|around|close|here)/i,
    /(?:find|search|look for|get|show me|locate)\s+(?:all\s+)?(?:the\s+)?(.+?)$/i,
  ];

  for (const pattern of searchPatterns) {
    const match = lowerMessage.match(pattern);
    if (match && userLocation) {
      let query = match[1].trim();
      // Clean up common suffixes
      query = query.replace(/\s*(near(?:by)?|around|close to|here|me|stores?|shops?|places?|locations?|businesses?)\s*$/gi, "").trim();
      if (query.length > 2) {
        return {
          type: "search_places",
          query,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusMeters: 8000,
        };
      }
    }
  }

  // Pattern 2: Create a place list
  // Examples: "create a list called favorites", "make a new list for hardware stores"
  const createListPatterns = [
    /(?:create|make|add|start)\s+(?:a\s+)?(?:new\s+)?(?:place\s+)?list\s+(?:called|named|for)?\s*["\']?([^"\']+)["\']?/i,
    /(?:new|add)\s+list\s+["\']?([^"\']+)["\']?/i,
  ];

  for (const pattern of createListPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        type: "create_place_list",
        name: match[1].trim(),
        hasProximityAlert: false, // Don't enable by default, let user explicitly enable
        proximityRadiusMeters: 500,
      };
    }
  }

  // Pattern 3: Search and add to list in one command
  // Examples: "find all plumbing stores and add them to my hardware list", "add coffee shops near me to my favorites"
  const searchAndAddPatterns = [
    /(?:find|search for|get)\s+(?:all\s+)?(.+?)\s+(?:and\s+)?add\s+(?:them\s+)?to\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
    /add\s+(?:all\s+)?(.+?)\s+(?:stores?|shops?|places?|near(?:by)?|around)?\s*to\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
  ];

  for (const pattern of searchAndAddPatterns) {
    const match = lowerMessage.match(pattern);
    if (match && userLocation) {
      const query = match[1].trim().replace(/\s*(stores?|shops?|places?|near(?:by)?|around)\s*$/gi, "").trim();
      const listName = match[2].trim();
      if (query.length > 2 && listName.length > 1) {
        return {
          type: "search_and_add_to_list",
          query,
          listName,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusMeters: 8000,
          createListIfNotExists: true,
        };
      }
    }
  }

  // Pattern 4: Add results to list (assumes previous search context)
  // Examples: "add them to my favorites", "add those to my hardware list"
  const addToListPatterns = [
    /add\s+(?:them|those|these|the\s+(?:places?|stores?|results?))\s+to\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
  ];

  for (const pattern of addToListPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        type: "add_place_to_list",
        listName: match[1].trim(),
      };
    }
  }

  // Pattern 5: Set/enable/disable proximity alerts
  // Examples: "set alerts for my hardware list", "enable notifications for favorites", "turn off alerts for coffee shops"
  const alertPatterns = [
    /(?:set|enable|turn on|add|activate)\s+(?:proximity\s+)?(?:alerts?|notifications?|reminders?)\s+(?:for|on|to)\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
    /(?:notify|alert|remind)\s+me\s+(?:when\s+)?(?:i\'?m?\s+)?(?:near|close to|around)\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
  ];

  for (const pattern of alertPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        type: "set_list_proximity_alert",
        listName: match[1].trim(),
        enabled: true,
        radiusMeters: 500,
      };
    }
  }

  // Pattern 6: Disable proximity alerts
  const disableAlertPatterns = [
    /(?:disable|turn off|remove|stop)\s+(?:proximity\s+)?(?:alerts?|notifications?|reminders?)\s+(?:for|on|from)\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
    /(?:stop|don\'?t)\s+(?:notify(?:ing)?|alert(?:ing)?|remind(?:ing)?)\s+me\s+(?:about|for)\s+(?:my\s+)?(?:the\s+)?["\']?([^"\']+)["\']?\s*(?:list)?/i,
  ];

  for (const pattern of disableAlertPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        type: "set_list_proximity_alert",
        listName: match[1].trim(),
        enabled: false,
      };
    }
  }

  return null;
}
