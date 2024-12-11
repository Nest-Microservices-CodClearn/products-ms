import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { NotFoundError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }
  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const totalPages = await this.product.count({ where: { available: true } });
    const lastPages = Math.ceil(totalPages / limit);
    //Mejorar para no permitir una pagina que no tenga más datos
    return {
      data: await this.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { available: true },
      }),
      meta: {
        total: totalPages,
        page: page,
        lastPage: lastPages,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id: id, available: true },
    });

    if (!product) {
      throw new RpcException({
        message: `El producto con el id #${id} no existe`,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;
    await this.findOne(id);
    //Optimizarla para no aceptar solicitudes vacías
    return this.product.update({
      where: { id },
      data: data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    //return this.product.delete({
    //  where: { id },
    //});
    const product = await this.product.update({
      where: { id },
      data: {
        available: false,
      },
    });
    return product;
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids)); //Borrar Duplicados
    const products = await this.product.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
    if (products.length == ids.length) {
      throw new RpcException({
        mesagge: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}
