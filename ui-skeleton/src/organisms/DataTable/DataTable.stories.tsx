import type { Meta, StoryObj } from '@storybook/react';

import * as React from 'react';

import { DataTable, type ColumnDef } from './DataTable';

interface Person {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  age: number;
  status: 'active' | 'pending' | 'suspended';
}

const fixture: Person[] = Array.from({ length: 24 }, (_, index) => {
  const roles: Person['role'][] = ['admin', 'editor', 'viewer'];
  const statuses: Person['status'][] = ['active', 'pending', 'suspended'];
  const firstNames = [
    'Alice',
    'Bob',
    'Charlie',
    'Diana',
    'Eve',
    'Frank',
    'Grace',
    'Hank',
    'Iris',
    'Jules',
    'Kira',
    'Liam',
    'Maya',
    'Noah',
    'Olive',
    'Pippa',
    'Quincy',
    'Rosa',
    'Sam',
    'Tara',
    'Una',
    'Vito',
    'Wren',
    'Yara',
  ];
  return {
    id: index + 1,
    name: firstNames[index] ?? `Person ${index + 1}`,
    email: `${(firstNames[index] ?? `person${index + 1}`).toLowerCase()}@example.com`,
    role: roles[index % roles.length] ?? 'viewer',
    age: 20 + (index * 3) % 40,
    status: statuses[index % statuses.length] ?? 'active',
  };
});

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true, filterable: true },
  { id: 'email', header: 'Email', accessor: (r) => r.email, filterable: true },
  { id: 'role', header: 'Role', accessor: (r) => r.role, sortable: true, filterable: true },
  { id: 'age', header: 'Age', accessor: (r) => r.age, sortable: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];

const meta: Meta<typeof DataTable<Person>> = {
  title: 'Organisms/DataTable',
  component: DataTable<Person>,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    density: { control: 'inline-radio', options: ['comfortable', 'compact'] },
    pageSize: { control: { type: 'number', min: 1, step: 1 } },
    sortable: { control: 'boolean' },
    filterable: { control: 'boolean' },
    selectable: { control: 'boolean' },
  },
  args: {
    data: fixture,
    columns,
    pageSize: 8,
    sortable: true,
    filterable: true,
    selectable: true,
    filterPlaceholder: 'Filter people…',
    'aria-label': 'People',
  },
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof DataTable<Person>>;

export const Default: Story = {};

export const ReadOnly: Story = {
  args: {
    sortable: false,
    filterable: false,
    selectable: false,
  },
};

export const SortableOnly: Story = {
  args: {
    filterable: false,
    selectable: false,
  },
};

export const FilterableOnly: Story = {
  args: {
    sortable: false,
    selectable: false,
  },
};

export const Selectable: Story = {
  args: {
    sortable: false,
    filterable: false,
  },
};

export const Compact: Story = {
  args: {
    size: 'sm',
    density: 'compact',
  },
};

export const Spacious: Story = {
  args: {
    size: 'lg',
    density: 'comfortable',
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
  },
};

export const WithSelectionListener: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [selected, setSelected] = React.useState<(string | number)[]>([]);
    return (
      <div className="flex flex-col gap-3">
        <DataTable<Person>
          {...args}
          selectable
          getRowId={(r) => r.id}
          onSelectionChange={setSelected}
        />
        <p className="text-sm text-muted-foreground">
          Selected ids: <code>{selected.length === 0
            ? '(none)'
            : selected.join(', ')}</code>
        </p>
      </div>
    );
  },
};
