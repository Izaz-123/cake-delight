const generateOrderNumber = () => {

    const now = new Date();

    const year = now.getUTCFullYear();

    const month = String(
        now.getUTCMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getUTCDate()
    ).padStart(2, "0");


    const random =
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();


    return `CD-${year}${month}${day}-${random}`;
};


module.exports = {
    generateOrderNumber
};