module.exports = {
    modules: ["mongodb"],
    data: {
        name: "MongoDB",
        closeConnection: true,
    },
    category: "Global Data",
    info: {
        source: "https://github.com/HannesRahn",
        creator: "Nade R.",
        donate: "https://github.com/HannesRahn",
    },
    UI: [
        {
            element: "input",
            name: "MongoDB Connection",
            placeholder: "mongodb://user:password@host:port",
            storeAs: "mongoConnection",
        },
        "-",
        {
            element: "input",
            name: "Database",
            storeAs: "databaseName",
        },
        {
            element: "input",
            name: "Collection",
            storeAs: "collectionName",
        },
        "-",
        {
            element: "typedDropdown",
            name: "Method",
            storeAs: "methodName",
            choices: {
                find: { name: "Find" },
                findOne: { name: "Find One" },
                insertMany: { name: "Insert" },
                insertOne: { name: "Insert One" },
                updateMany: { name: "Update" },
                updateOne: { name: "Update One" },
                replaceOne: { name: "Replace One" },
                deleteMany: { name: "Delete" },
                deleteOne: { name: "Delete One" },
                findOneAndUpdate: { name: "Find One & Update" },
                findOneAndReplace: { name: "Find One & Replace" },
                findOneAndDelete: { name: "Find One & Delete" },
                aggregate: { name: "Aggregate" },
                distinct: { name: "Distinct" },
                countDocuments: { name: "Count Documents" },
            }
        },
        {
            element: "largeInput",
            name: "Arguments (JSON Array)",
            placeholder: "Example: [{ \"_id\": \"value\" }] or [[{ \"$match\": {...} }]",
            storeAs: "argsJson",
        },
        "-",
        {
            element: "toggleGroup",
            storeAs: ["stringifyResult", "closeConnection"],
            nameSchemes: ["Stringify Result", "Close Connection"],
        },
        "-",
        {
            element: "storageInput",
            name: "Store Result As",
            storeAs: "store",
            optional: true
        },
        {
            element: "storageInput",
            name: "Store MongoDB Connection As",
            storeAs: "mdbcStore",
            optional: true
        },
        "-"
    ],
    subtitle: (data, constants) => {
        return `Method: ${data.methodName} - Collection: ${
            data.collectionName
        } - Store As: ${constants.variable(data.store)}`;
    },
    compatibility: ["Any"],

    async run(values, message, client, bridge) {
        const { MongoClient } = await client.getMods().require("mongodb");
        let mongoClient;

        try {
        const mongoConnection = bridge.transf(values.mongoConnection);
        const databaseName = bridge.transf(values.databaseName);
        const collectionName = bridge.transf(values.collectionName);
        const methodName = bridge.transf(values.methodName.type);
        const argsJson = bridge.transf(values.argsJson || '[]');

        if (!mongoConnection) throw new Error("MongoDB Connection String is required.");
        if (!databaseName) throw new Error("Database Name is required.");
        if (!collectionName) throw new Error("Collection Name is required.");

        if (typeof mongoConnection === 'string') mongoClient = new MongoClient(mongoConnection);
        else if (typeof mongoConnection === 'object' && mongoConnection !== null && typeof mongoConnection.db === 'function') mongoClient = mongoConnection;
        else throw new Error("MongoDB Connection must be a valid string URI or an existing MongoClient instance.");
        await mongoClient.connect();

        const database = mongoClient.db(databaseName);
        const collection = database.collection(collectionName);

        let args;
        try {
            args = JSON.parse(argsJson);
            if (!Array.isArray(args)) throw new Error("Arguments must be a valid JSON array string.");
        } catch (e) {
            throw new Error(`Invalid JSON in Arguments field: ${e.message}. Input was: ${argsJson}`);
        }

        if (typeof collection[methodName] !== 'function') throw new Error(`Method '${methodName}' is not a valid function on the MongoDB collection object.`);

        const method = collection[methodName];
        let result = await method.apply(collection, args);

        if (result && typeof result.toArray === 'function') result = await result.toArray();

        if (values.stringifyResult) result = JSON.stringify(result);

        bridge.store(values.store, result);
        if (values.mdbcStore.type != 'none') bridge.store(values.mdbcStore, mongoClient);
        } catch (error) {
            throw new Error(`MongoDB Action Error: ${error.message}`);
        } finally {
            if (values.closeConnection) {
                if (values.mdbcStore.type != 'none') console.warn("Warning: Storing the MongoDB connection while 'Close Connection' is enabled. The stored connection will be closed.");
                await mongoClient.close();
            }
        }
    },
};
