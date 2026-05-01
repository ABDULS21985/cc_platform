export default function useCurrency() {
    const formatter = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN"
    });

    const formatCurrency = (amount: number) => {
        return formatter.format(amount);
    };

    return { formatCurrency };
}