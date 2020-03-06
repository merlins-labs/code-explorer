import React from "react";

import { FooterRow } from "../../components/FooterRow";
import { settings } from "../../settings";
import { Codes } from "./Codes";

export default function CodesPage(): JSX.Element {
  return (
    <div className="container mt-3">
      <div className="row white-row white-row-first">
        <div className="col">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item active" aria-current="page">
                Codes
              </li>
            </ol>
          </nav>
        </div>
      </div>
      <div className="row white-row white-row-last">
        <div className="col">
          <Codes />
        </div>
      </div>
      <FooterRow endpoint={settings.backend.nodeUrl} />
    </div>
  );
}
