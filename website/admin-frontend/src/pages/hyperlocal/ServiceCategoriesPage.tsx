import { useState } from 'react';
import { toast } from 'sonner';
import type { CategoryRecord } from '@/api/hyperlocal';
import { useCategoriesList, useCreateCategory, useUpdateCategory } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';

const initial = {
  name: '',
  slug: '',
  description: '',
  icon: 'tools',
  imageUrl: '',
  basePrice: '0',
  priceUnit: 'inspection',
  isActive: true,
  sortOrder: '0',
};

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const errorMessage = (error: any) => {
  const details = error.response?.data?.error?.details;
  if (Array.isArray(details) && details.length) return details.map((detail) => `${detail.path}: ${detail.message}`).join(' | ');
  return error.response?.data?.error?.message || 'Failed to save category.';
};

export const ServiceCategoriesPage = () => {
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState('');

  const { data: categories, isLoading } = useCategoriesList();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const save = () => {
    const payload = { ...form, basePrice: Number(form.basePrice), sortOrder: Number(form.sortOrder), cityAvailability: [] };
    const onSettled = {
      onSuccess: () => {
        toast.success('Service category saved.');
        setEditing('');
        setForm(initial);
      },
      onError: (e: any) => toast.error(errorMessage(e)),
    };
    if (editing) updateCategory.mutate({ id: editing, payload }, onSettled);
    else createCategory.mutate(payload, onSettled);
  };

  const edit = (item: CategoryRecord) => {
    setEditing(item._id);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      icon: item.icon || 'tools',
      imageUrl: item.imageUrl || '',
      basePrice: String(item.basePrice),
      priceUnit: item.priceUnit,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder || 0),
    });
  };

  const saving = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Service Categories" description="Dynamic service catalog, pricing and availability." />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Edit' : 'Add'} service category</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {(['name', 'slug', 'description', 'icon', 'imageUrl', 'basePrice', 'sortOrder'] as const).map((key) => (
            <Input key={key} placeholder={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: key === 'slug' ? slugify(e.target.value) : e.target.value })} />
          ))}
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.priceUnit}
            onChange={(e) => setForm({ ...form, priceUnit: e.target.value })}
          >
            <option value="inspection">Inspection</option>
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2 md:col-span-3">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save category'}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing('');
                  setForm(initial);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading categories…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories?.map((item) => (
            <Card key={item._id}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  From ₹{item.basePrice} · {item.priceUnit}
                </p>
                <p>{item.description}</p>
                <p>{item.isActive ? 'Active' : 'Inactive'}</p>
                <Button variant="outline" onClick={() => edit(item)}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
