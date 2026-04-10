import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200, description: 'Participant invited' })
  @ApiResponse({ status: 400, description: 'Invalid invite payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt or user not found' })
  inviteParticipant(
    @Param('id') receiptId: string,
    @Request() req,
    @Body() dto: InviteParticipantDto,
  ) {
    return this.splittingService.inviteParticipant(receiptId, req.user.userId, dto.userId);
  }

  @Patch(':id/items/:itemId/claim')
  @ApiOperation({ summary: "Participant marks an item as their cost" })
  @ApiResponse({ status: 200, description: 'Claim created or updated' })
  @ApiResponse({ status: 400, description: 'Invalid claim payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt or item not found' })
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
  @ApiResponse({ status: 200, description: 'Claims returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  getClaims(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.getClaims(receiptId, req.user.userId);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Gets a summary of all participants and their shares' })
  @ApiResponse({ status: 200, description: 'Summary returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  getSummary(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.getSummary(receiptId, req.user.userId);
  }

  @Delete(':id/items/:itemId/claim')
  @ApiOperation({ summary: 'Removes a claim from an item' })
  @ApiResponse({ status: 200, description: 'Claim removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt or item not found' })
  removeClaim(
    @Param('id') receiptId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.splittingService.removeClaim(receiptId, itemId, req.user.userId);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Makes a receipt private again (removes all participants and claims)' })
  @ApiResponse({ status: 200, description: 'Receipt made private' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  revokeShare(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.revokeShare(receiptId, req.user.userId);
  }

  @Delete(':id/participants/me')
  @ApiOperation({ summary: 'Participant leaves the shared receipt (removes all their claims)' })
  @ApiResponse({ status: 200, description: 'Participant removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden for current user' })
  @ApiResponse({ status: 404, description: 'Receipt not found' })
  leaveReceipt(@Param('id') receiptId: string, @Request() req) {
    return this.splittingService.leaveReceipt(receiptId, req.user.userId);
  }
}
