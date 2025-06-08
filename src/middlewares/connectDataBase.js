import mongoose from "mongoose";
import colors from "colors";

const connectDataBase = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDb connected: ${connect.connection.host}`.magenta);
  } catch (error) {
    console.log(`Error connecting to mongoDB: ${error.message}`.red);
    process.exit(1);
  }
};

export default connectDataBase;
