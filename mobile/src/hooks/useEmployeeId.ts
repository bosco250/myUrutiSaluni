import { useState, useEffect } from "react";
import { useAuth } from "../context";
import { staffService } from "../services/staff";

/**
 * Hook to get employee ID for the current user
 * Handles both single and array responses from the API
 */
export const useEmployeeId = (): string | null => {
  const { user } = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeId = async () => {
      if (user?.id) {
        try {
          const employee = await staffService.getEmployeeByUserId(
            String(user.id)
          );
          if (employee) {
            const employeeData = Array.isArray(employee)
              ? employee[0]
              : employee;
            // Ensure employeeData exists and has an id before setting
            if (employeeData && employeeData.id) {
              setEmployeeId(employeeData.id);
            } else {
              // Employee not assigned to any salon - empty state will handle this
              setEmployeeId(null);
            }
          }
        } catch (err) {
          console.error("Error fetching employee ID:", err);
          setEmployeeId(null);
        }
      }
    };
    fetchEmployeeId();
  }, [user?.id]);

  return employeeId;
};
