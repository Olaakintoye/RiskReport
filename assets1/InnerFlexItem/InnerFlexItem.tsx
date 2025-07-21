import * as React from "react";

function InnerFlexItem() {
  return (
    <div className="flex z-10 justify-center items-center p-1 -mt-2.5">
      <DeepestFlexItem />
    </div>
  );
}

export default InnerFlexItem;
