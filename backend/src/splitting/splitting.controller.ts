import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SplittingService } from './splitting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { ClaimItemDto } from './dto/claim-item.dto';

@ApiTags('cost-split')
@Controller('receipts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SplittingController {
  constructor(private readonly splittingService: SplittingService) {}

  @Post(':id/participants')
  @ApiOperation({ summary: 'Adds a user to the receipt (invite)' })
  inviteParticipant(
    @Param('id') receiptId: string,
    @Request() req,
    @Body() dto: InviteParticipantDto,
  ) {
    return this.splittingService.inviteParticipant(receiptId, req.user.userId, dto.userId);
  }

  @Patch(':id/items/:itemId/claim')
  @ApiOperation({ summary: "Participant marks an item as their cost" })
  claimItem(
    @Param('id') receiptId: string,
    @Param('itemId') itemId: string,
    @Request() req,
    @Body() dto: ClaimItemDto,
  ) {
    return this.splittingService.claimItem(receiptId, itemId, req.user.userId, dto);
  }

  @Get(':id/claims')
  @ApiOperation({ summary: 'Gets all claims for a receipt' })
  getClaims(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.getClaims(receiptId, req.user.userId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Gets a summary of all participants and their shares' })
  getSummary(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.getSummary(receiptId, req.user.userId);
  }

  @Delete(':id/items/:itemId/claim')
  @ApiOperation({ summary: 'Removes a claim from an item' })
  removeClaim(
    @Param('id') receiptId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.splittingService.removeClaim(receiptId, itemId, req.user.userId);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Makes a receipt private again (removes all participants and claims)' })
  revokeShare(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.revokeShare(receiptId, req.user.userId);
  }

  @Delete(':id/participants/me')
  @ApiOperation({ summary: 'Participant leaves the shared receipt (removes all their claims)' })
  leaveReceipt(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.leaveReceipt(receiptId, req.user.userId);
  }
}
