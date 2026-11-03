import type {ReactNode} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import PageActions from '@site/src/components/PageActions';

type Props = WrapperProps<typeof ContentType>;

// Wraps the stock doc content with the "Copy page / Open in Claude" toolbar.
export default function ContentWrapper(props: Props): ReactNode {
  return (
    <>
      <PageActions />
      <Content {...props} />
    </>
  );
}
