import { Controller, Get } from "@nestjs/common";
import { LocationsService } from "../locations/locations.service";

@Controller("health")
export class HealthController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  getHealth() {
    return {
      service: "api",
      status: "ok"
    };
  }

  @Get("locations-catalog")
  async getLocationsCatalogHealth() {
    const summary = await this.locationsService.getCatalogHealthSummary();

    return {
      service: "locations-catalog",
      ...summary
    };
  }
}
