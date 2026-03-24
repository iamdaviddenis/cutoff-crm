import { Customer360Page } from "../../../components/customer-360";

export const metadata = { title: "Customer — CutOff CRM" };

export default function CustomerDetailPage({ params }) {
  return <Customer360Page customerId={params.id} />;
}
