import { Request, Response } from 'express';
import knex from '../database/connection';
class PointsController {
  async list(request: Request, response: Response) {
    const { uf, city, items } = request.query;

    const parsedItems = String(items)
      .split(',')
      .map(items => Number(items.trim()));
    
    const points = await knex('points')
      .join('point_items',  'points.id', '=', 'point_items.point_id')
      .whereIn('point_items.item_id', parsedItems)
      .where('city', String(city))
      .where('uf', String(uf))
      .distinct()
      .select('points.*');

    const serilizedPoints = points.map(point => {
      return {
        ...point,
        image_url: `http://localhost:3333/uploads/${point.image}`,
      }
    })

    return response.json(serilizedPoints);
  }
  async show(request: Request, response: Response) {
    const { id } = request.params;
    const point = await knex('points').where('id', id).first();

    if (!point) {
      return response.status(404).json({ message: 'Point not found.' });
    }

    const serilizedPoint = {
      ...point,
      image_url: `http://localhost:3333/uploads/${point.image}`,
    };

    const items = await knex('items')
      .join('point_items', 'items.id', '=', 'point_items.item_id')
      .where('point_items.point_id', id);

    return response.json({ point: serilizedPoint, items });
  }
  async create(request: Request, response: Response) {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items
    } = request.body;

    const trx = await knex.transaction();

    try {
      const point = {
        image: request.file.filename,
        name,
        email,
        whatsapp,
        latitude,
        longitude,
        city,
        uf
      }
  
      const insertedIds = await trx('points').insert(point);
    
      const [ point_id ] = insertedIds;
      const pointItems = items
        .split(',')
        .map((item: string) => Number(item.trim()))
        .map((item_id: number) => {
        return {
          item_id,
          point_id
        }
      });
      
      await trx('point_items').insert(pointItems);

      trx.commit();
    
      return response.json({ 
        id: point_id,
        ... point
       });
    } catch (error) {
      trx.rollback();
      response.status(500).json(error.message);
    }
  }
}

export default PointsController;