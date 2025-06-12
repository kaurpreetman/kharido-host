import { redis } from '../lib/redis.js';
import Product from '../models/Product.model.js';
import cloudinary from '../lib/cloudinary.js';
import Order from '../models/order.model.js'

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      subCategory,
      sizes,
      bestseller,
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required.' });
    }

    const imageUrls = [];

    const uploadImageToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(fileBuffer);
      });
    };

    const imageKeys = ['image1', 'image2', 'image3', 'image4'];
    for (const key of imageKeys) {
      if (req.files && req.files[key] && req.files[key][0]) {
        const fileBuffer = req.files[key][0].buffer;
        const result = await uploadImageToCloudinary(fileBuffer);
        imageUrls.push(result.secure_url);
      }
    }

    // Safely parse sizes
    let parsedSizes = [];
    if (sizes) {
      try {
        const temp = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
        if (Array.isArray(temp)) parsedSizes = temp;
      } catch (err) {
        console.warn('Invalid sizes format:', sizes);
        // optional: return an error or default to empty
      }
    }

    const newProduct = new Product({
      name,
      description,
      price: Number(price),
      category,
      subCategory,
      sizes: parsedSizes,
      bestseller: bestseller === 'true',
      date: Date.now(),
      image: imageUrls,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: savedProduct,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
 



  



export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
   res.status(200).json({ success: true, message: "Products retrieved successfully.", products });

  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const singleProduct=async(req,res)=>{
    try{
      
        const {productId} = req.body;
        console.log(productId);
        const product = await Product.findById(productId);
        console.log(product)
        if(!product){
           return res.status(404).json({message:"Product Not find"});
        }
        res.status(200).json({message:"Product retrives succesfully",product});

    }
    catch(error){
        console.error("Error fetching product:", error);
    res.status(500).json({ message: "Internal Server Error" });
    }
}


export const deleteProduct = async (req, res) => {
  try {
    console.log("params: ", req.params.id);
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Loop through all images and delete from Cloudinary
    if (product.image && product.image.length > 0) {
      for (const url of product.image) {
        const publicId = url.split("/").pop().split(".")[0]; // extract file name without extension
        try {
          await cloudinary.uploader.destroy(`products/${publicId}`);
          console.log(`✅ Deleted image: products/${publicId}`);
        } catch (cloudError) {
          console.error(`❌ Failed to delete image: products/${publicId}`, cloudError);
        
        }
      }
    }

    return res.status(200).json({ success: true, message: "Product and all images deleted successfully" });

  } catch (error) {
    console.error("Error in deleteProduct controller:", error.message);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

export const getBestsellerProducts = async (req, res) => {
  try {
    const bestsellerProducts = await Product.find({ bestseller: true });
    res.status(200).json({
      success: true,
      message: "Bestseller products fetched successfully",
      data: bestsellerProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch bestseller products",
      error: error.message
    });
  }
};

export const getProductCategory= async(req,res)=>{

    const {category_id}=req.params;
    try{
        const products=await Product.find({category_id});
        res.json(products);
    }catch(error){
        console.log("Error in getProductsByCategory controller",error.message);
        res.status(500).json({message:"Server error",error:error.message});
    }
}
export const togglefeaturedProduct=async(req,res)=>{
    try{
        const product=await Product.findById(req.params.id);
        if(product){
            product.isFeatured = !product.isFeatured;
            const updatedProduct= await product.save();
            await updateFeaturedProductsCache();
            res.json(updatedProduct);

        }
        else{
            res.status(404).json({message:"Product not found"});
        }
    }
    catch(error){
        console.log("Error in togglefeaturedProduct controller",error.message);
        res.status(500).json({message:"Server error",error:error.message});
    }
}

 


export const addReview = async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;
  const user = req.user; // assuming auth middleware

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const alreadyReviewed = product.reviews.find(r => r.user.toString() === user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ message: 'You already reviewed this product' });

    const review = {
      user: user._id,
      name: user.name,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);

    product.averageRating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();

    res.status(201).json({
  message: 'Review added',
  product: {
    reviews: product.reviews,
    averageRating: product.averageRating,
  }
});

  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Find existing product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Extract fields from body
    const {
      name,
      description,
      price,
      category,
      subCategory,
      sizes,
      bestseller,
    } = req.body;

    // Handle sizes parsing
    let parsedSizes = [];
    if (sizes) {
      try {
        const temp = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
        if (Array.isArray(temp)) parsedSizes = temp;
      } catch (err) {
        console.warn('Invalid sizes format:', sizes);
      }
    }

    // Handle images update
    const uploadImageToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'products' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(fileBuffer);
      });
    };

    const imageKeys = ['image1', 'image2', 'image3', 'image4'];
    const newImages = [...product.image]; // Start with existing images

    for (let i = 0; i < imageKeys.length; i++) {
      const key = imageKeys[i];

      if (req.files && req.files[key] && req.files[key][0]) {
        // If file exists for this slot, first delete old image if any
        if (newImages[i]) {
          const publicId = newImages[i].split("/").pop().split(".")[0];
          try {
            await cloudinary.uploader.destroy(`products/${publicId}`);
          } catch (cloudError) {
            console.error(`❌ Failed to delete image: products/${publicId}`, cloudError);
          }
        }

        const fileBuffer = req.files[key][0].buffer;
        const result = await uploadImageToCloudinary(fileBuffer);
        newImages[i] = result.secure_url;
      }
    }

    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price ? Number(price) : product.price;
    product.category = category || product.category;
    product.subCategory = subCategory || product.subCategory;
    product.sizes = parsedSizes.length ? parsedSizes : product.sizes;
    product.bestseller = bestseller === 'true' ? true : bestseller === 'false' ? false : product.bestseller;
    product.image = newImages;

    const updatedProduct = await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updatedProduct,
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
