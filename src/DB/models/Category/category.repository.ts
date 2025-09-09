import { Inject, Injectable } from "@nestjs/common";
import { DBService } from "../db.service";
import { Category, Tcategory } from "./category.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
@Injectable()
export class categoryRepository extends DBService<Tcategory> {
    constructor(@InjectModel(Category.name) private readonly categoryModel: Model<Tcategory>){
        super(categoryModel)
    }
}