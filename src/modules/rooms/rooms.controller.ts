import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Room } from '../../entities/room.entity';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  async findAll(): Promise<Room[]> {
    return this.roomsService.findAll();
  }

  @Get(':name')
  async findOne(@Param('name') name: string): Promise<Room> {
    return this.roomsService.findOne(name);
  }

  @Post()
  async create(@Body() data: Partial<Room>): Promise<Room> {
    return this.roomsService.create(data);
  }

  @Put(':name')
  async update(@Param('name') name: string, @Body() data: Partial<Room>): Promise<Room> {
    return this.roomsService.update(name, data);
  }

  @Delete(':name')
  async remove(@Param('name') name: string): Promise<{ success: boolean }> {
    await this.roomsService.remove(name);
    return { success: true };
  }
}
