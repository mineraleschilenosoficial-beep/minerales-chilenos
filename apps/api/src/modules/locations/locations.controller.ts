import { Controller, Get, Query } from "@nestjs/common";
import {
  locationCommunesQuerySchema,
  locationCommunesResponseSchema,
  locationCountriesResponseSchema,
  locationRegionsQuerySchema,
  locationRegionsResponseSchema
} from "@minerales/contracts";
import { LocationsService } from "./locations.service";

type LocationQuery = {
  countryCode?: string;
  regionCode?: string;
};

@Controller("locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * @description Lists active countries.
   * @returns Country catalog response.
   */
  @Get("countries")
  async listCountries() {
    const response = await this.locationsService.listCountries();
    return locationCountriesResponseSchema.parse(response);
  }

  /**
   * @description Lists active regions by country.
   * @param query Raw query parameters.
   * @returns Region catalog response.
   */
  @Get("regions")
  async listRegions(@Query() query: LocationQuery) {
    const parsedQuery = locationRegionsQuerySchema.parse({
      countryCode: query.countryCode
    });
    const response = await this.locationsService.listRegions(parsedQuery);
    return locationRegionsResponseSchema.parse(response);
  }

  /**
   * @description Lists active communes by region code.
   * @param query Raw query parameters.
   * @returns Commune catalog response.
   */
  @Get("communes")
  async listCommunes(@Query() query: LocationQuery) {
    const parsedQuery = locationCommunesQuerySchema.parse({
      regionCode: query.regionCode
    });
    const response = await this.locationsService.listCommunes(parsedQuery);
    return locationCommunesResponseSchema.parse(response);
  }
}
