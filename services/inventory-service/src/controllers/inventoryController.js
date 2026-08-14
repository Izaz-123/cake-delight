const inventoryService =
    require("../services/inventoryService");


const getInventory = async (
    req,
    res,
    next
) => {

    try {

        const inventory =
            await inventoryService.getInventory(
                req.params.cakeId
            );


        if (!inventory) {

            return res.status(404).json({
                message:
                    "Inventory not found"
            });
        }


        res.status(200).json(
            inventory
        );

    } catch (error) {

        next(error);
    }
};


module.exports = {
    getInventory
};