import express from "express";
import mongoose from "mongoose";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3000;



const startServer = async() => {
  try {
    mongoose.connect(process.env.MONGO_DB);
    app.listen(PORT, () =>
      console.log("База данных подключена.Сервер запущен.")
    );
  } catch (error) {
    console.log("Ошибка в подключении");
  }
};

export default startServer
