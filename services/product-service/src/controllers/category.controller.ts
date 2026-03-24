import { Request, Response } from 'express';
import { Category } from '../models/category.model';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('sortOrder');
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCategoryBySlug = async (req: Request, res: Response) => {
  try {
    const cat = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!cat) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const cat = await Category.create({
      name: req.body.name,
      slug: req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: req.body.description,
      image: req.body.image,
      parentCategory: req.body.parentCategory,
      sortOrder: req.body.sortOrder || 0,
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Seed default categories on startup if none exist
export const seedCategories = async () => {
  const count = await Category.countDocuments();
  if (count > 0) return;
  const defaults = [
    { name: 'Electronics',  slug: 'electronics',  image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&q=80', sortOrder: 1 },
    { name: 'Fashion',      slug: 'fashion',       image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80', sortOrder: 2 },
    { name: 'Sports',       slug: 'sports',        image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&q=80', sortOrder: 3 },
    { name: 'Home Living',  slug: 'home-living',   image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80', sortOrder: 4 },
    { name: 'Beauty',       slug: 'beauty',        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80', sortOrder: 5 },
    { name: 'Grocery',      slug: 'grocery',       image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', sortOrder: 6 },
    { name: 'Books',        slug: 'books',         image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400', sortOrder: 7 },
  ];
  await Category.insertMany(defaults);
  console.log('✅ Default categories seeded');
};
