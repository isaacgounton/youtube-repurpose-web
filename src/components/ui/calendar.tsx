"use client"

import * as React from "react";
import DatePicker from "react-date-picker";
import "react-date-picker/dist/DatePicker.css";
import "react-calendar/dist/Calendar.css";

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export function Calendar() {
  const [value, setValue] = React.useState<Value>(new Date());

  return (
    <div className="p-3">
      <DatePicker onChange={setValue} value={value} />
    </div>
  );
}
