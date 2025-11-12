import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl } from "@/components/ui/form";

interface IASelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}

export function IASelector({ value, onValueChange, placeholder = "Selecione a IA", disabled = false, testId = "select-ia" }: IASelectorProps) {
  const { data: ias = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/ias"],
  });

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <FormControl>
        <SelectTrigger data-testid={testId}>
          <SelectValue placeholder={isLoading ? "Carregando IAs..." : placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {ias.map((ia) => (
          <SelectItem key={ia.id} value={ia.id} data-testid={`select-ia-option-${ia.id}`}>
            {ia.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
