import { Body, Controller, Get, HttpCode, Inject, Module, Post } from '@nestjs/common'
import { DyCardService } from './dy-card.service'

// [PLATFORM-INTEGRATION: mount below the template's api global prefix; import DyCardModule in its root module]
@Controller()
export class DyCardController {
  constructor(@Inject(DyCardService) private readonly service: DyCardService) {}

  @Get('dy_card/data')
  resolveCardData() {
    return this.service.resolveCardData()
  }

  @Post('newton/compile-patch') @HttpCode(200)
  compilePatch(@Body() input: unknown) {
    return this.service.compilePatch(input)
  }

  @Post('newton/director-react') @HttpCode(200)
  directorReact(@Body() input: unknown) {
    return this.service.directorReact(input)
  }

  @Post('newton/squad-boost') @HttpCode(200)
  squadBoost(@Body() input: unknown) {
    return this.service.squadBoost(input)
  }
}

@Module({ controllers: [DyCardController], providers: [DyCardService] })
export class DyCardModule {}
