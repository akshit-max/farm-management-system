import { Construction } from "lucide-react";

export function ComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
      <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-12 h-12 text-brand-primary" />
      </div>
      <h2 className="text-3xl font-bold text-text-heading mb-3">{moduleName}</h2>
      <p className="text-text-secondary max-w-md text-lg">
        This module is currently under active development. It will be available in the upcoming phase of the ERP rollout.
      </p>
    </div>
  );
}
